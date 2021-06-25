package service

import (
	"errors"
	"io/ioutil"
	"os"
	"path"

	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"gorm.io/gorm"
)

type StorageService struct {
	storageRepository  *repository.StorageRepository
	userRepository     *repository.UserRepository
	propertyRepository *repository.PropertyRepository
}

func NewStorageService(storageRepository *repository.StorageRepository, userRepository *repository.UserRepository, propertyRepository *repository.PropertyRepository) *StorageService {
	return &StorageService{storageRepository: storageRepository, userRepository: userRepository, propertyRepository: propertyRepository}
}

func (r StorageService) InitStorages() error {
	drivePath := r.GetBaseDrivePath()
	users := r.userRepository.FindAll()
	for i := range users {
		userId := users[i].ID
		_, err := r.storageRepository.FindByOwnerIdAndDefault(userId, true)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			storage := model.Storage{
				ID:        userId,
				Name:      users[i].Nickname + "的默认空间",
				IsShare:   false,
				IsDefault: true,
				LimitSize: -1,
				Owner:     userId,
				Created:   utils.NowJsonTime(),
			}
			if err := os.MkdirAll(path.Join(drivePath, storage.ID), os.ModePerm); err != nil {
				return err
			}
			err := r.storageRepository.Create(&storage)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

type File struct {
	Name    string         `json:"name"`
	Path    string         `json:"path"`
	IsDir   bool           `json:"isDir"`
	Mode    string         `json:"mode"`
	IsLink  bool           `json:"isLink"`
	ModTime utils.JsonTime `json:"modTime"`
	Size    int64          `json:"size"`
}

func (r StorageService) Ls(drivePath, remoteDir string) ([]File, error) {
	fileInfos, err := ioutil.ReadDir(path.Join(drivePath, remoteDir))
	if err != nil {
		return nil, err
	}

	var files = make([]File, 0)
	for i := range fileInfos {
		file := File{
			Name:    fileInfos[i].Name(),
			Path:    path.Join(remoteDir, fileInfos[i].Name()),
			IsDir:   fileInfos[i].IsDir(),
			Mode:    fileInfos[i].Mode().String(),
			IsLink:  fileInfos[i].Mode()&os.ModeSymlink == os.ModeSymlink,
			ModTime: utils.NewJsonTime(fileInfos[i].ModTime()),
			Size:    fileInfos[i].Size(),
		}

		files = append(files, file)
	}
	return files, nil
}

func (r StorageService) GetBaseDrivePath() string {
	baseDrivePath, _ := r.propertyRepository.GetBaseDrivePath()
	return baseDrivePath
}
